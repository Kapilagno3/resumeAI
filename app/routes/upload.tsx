import { prepareInstructions } from 'constants/index'
import React, { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import FileUploader from '~/components/FileUploader'
import Navbar from '~/components/Navbar'
import { convertPdfToImage } from '~/lib/pdf2img'
import { usePuterStore } from '~/lib/puter'
import { generateUUID } from '~/lib/utils'

const upload = () => {
    const {auth,isLoading,fs,ai,kv}=usePuterStore();
    const navigate=useNavigate();
    const [isProcessing, setIsProcessing] = useState(false)
    const [statusText, setStatusText] = useState("")
    const [file, setFile] = useState<File|null>(null)
    const handleFileSelect=(file:File|null)=>{
        setFile(file)
    }
    const handleAnalyze = async ({
        companyName,
        jobTitle,
        jobDescription,
        file,
    }: {
        companyName: string;
        jobTitle: string;
        jobDescription: string;
        file: File;
    }) => {
        try {
            setIsProcessing(true);
            setStatusText("uploading the resume...");

            const uploadedFile = await fs.upload([file]);
            if (!uploadedFile) {
                setStatusText("Error: file could not be uploaded");
                return;
            }

            setStatusText("Converting to image..");
            const imageResult = await convertPdfToImage(file);
            if (!imageResult.file) {
                setStatusText(
                    `Error: ${imageResult.error ?? "file could not be converted to image"}`
                );
                return;
            }

            setStatusText("Uploading the image...");
            const uploadedImage = await fs.upload([imageResult.file]);
            if (!uploadedImage) {
                setStatusText("Error: image could not be uploaded");
                return;
            }

            setStatusText("preparing data...");
            const uuid = generateUUID();
            const data = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName,
                jobTitle,
                jobDescription,
                feedback: "",
            };

            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            setStatusText("analyzing...");

            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({ jobTitle, jobDescription })
            );
            if (!feedback) {
                setStatusText("Error: Failed to analyze resume");
                console.error("AI feedback returned no response");
                return;
            }

            const feedbackText =
                typeof feedback.message.content === "string"
                    ? feedback.message.content
                    : feedback.message.content[0].text;

            try {
                data.feedback = JSON.parse(feedbackText);
            } catch (parseError) {
                console.error("Failed to parse feedback JSON:", parseError, feedbackText);
                setStatusText("Error: Unexpected feedback format from AI");
                return;
            }

            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            console.log("Resume analysis complete:", data);
            setStatusText("Analysis complete, Redirecting...");
            navigate(`/resume/${uuid}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("handleAnalyze failed:", err);
            setStatusText(`Error: ${message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form=e.currentTarget.closest("form");
        if (!form)return;
        const formdata=new FormData(form);
        const companyName=formdata.get("company-name") as string
        const jobTitle=formdata.get("job-title") as string
        const jobDescription=formdata.get("job-description") as string

        if(!file) return;

        await handleAnalyze({companyName,jobTitle,jobDescription,file});
    }
  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
        <Navbar/>
        <section className={"main-section"}
        >
            <div className="page-heading py-16">
                <h1>Smart feedback for your dream job</h1>
                {isProcessing ?(
                    <>
                        <h2>{statusText}</h2>
                        <img src="/images/resume-scan.gif" className='w-full' />
                    </>
                ):(
                    <h2>Drop resume for ATS score and improvement tips </h2>
                )}
                {!isProcessing &&(
                    <form id='upload-form' onSubmit={handleSubmit} className='flex flex-col gap-4 mt-8'>
                        <div className="form-div">
                            <label htmlFor="company-name">Company Name</label>
                            <input type="text" name='company-name' placeholder='Company Name' id='company-name' />
                        </div>
                        <div className="form-div">
                            <label htmlFor="job-title">Job Title</label>
                            <input type="text" name='job-title' placeholder='Job Title' id='job-title' />
                        </div>
                        <div className="form-div">
                            <label htmlFor="job-description">Job Description</label>
                            <textarea rows={5} name='job-description' placeholder='Job Description' id='job-description' />
                        </div>
                        <div className="form-div">
                            <label htmlFor="uploader">Upload Resume</label>
                            <FileUploader onFileSelect={handleFileSelect}/>
                        </div>
                        <button className='primary-button' type='submit'>Analyse Resume</button>
                    </form>
                )}
            </div>
        </section>
    </main>
  )
}

export default upload